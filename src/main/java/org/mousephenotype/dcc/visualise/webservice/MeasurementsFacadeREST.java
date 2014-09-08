/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.webservice;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.entities.overviews.MeasuredValues;
import org.mousephenotype.dcc.entities.overviews.MetadataGroupToValues;
import org.mousephenotype.dcc.entities.overviews.ProcedureMetadataGroup;
import org.mousephenotype.dcc.entities.qc.StateAndUnresolvedIssuesCount;

/**
 * Web service for retrieving measurements for a given data context.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("measurements")
public class MeasurementsFacadeREST extends AbstractFacade<MeasuredValues> {

    private final int QC_DONE = 0;
    private final int QC_PENDING = 1;
    private final int QC_ISSUES = 2;

    public MeasurementsFacadeREST() {
        super(MeasuredValues.class);
    }

    private List<MeasuredValues> getMutantMeasurements(
            Integer centreId,
            Integer genotypeId,
            Integer strainId,
            String procedureKey,
            String parameterKey) {
        EntityManager em = getEntityManager();
        TypedQuery<MeasuredValues> query
                = em.createNamedQuery(
                        "MeasurementsPerformed.findMutantMeasurementsIgnorePipeline",
                        MeasuredValues.class);
        query.setParameter("centreId", centreId);
        query.setParameter("genotypeId", genotypeId);
        query.setParameter("strainId", strainId);
        query.setParameter("procedureKey", procedureKey);
        query.setParameter("parameterKey", parameterKey);
        List<MeasuredValues> temp = query.getResultList();
        em.close();
        return temp;
    }

    private List<MeasuredValues> getBaselineMeasurements(
            Integer centreId,
            Integer strainId,
            String parameterKey,
            ProcedureMetadataGroup t) {
        System.err.println(t.getMetadataGroup());
        EntityManager em = getEntityManager();
        TypedQuery<MeasuredValues> query
                = em.createNamedQuery(
                        "MeasurementsPerformed.findBaselineMeasurements",
                        MeasuredValues.class);
        query.setParameter("parameterId", parameterKey);
        query.setParameter("centreId", centreId);
        query.setParameter("strainId", strainId);
        query.setParameter("procedureId", t.getProcedureId());
        query.setParameter("metadataGroup", t.getMetadataGroup());
        query.setParameter("pipeline", t.getPipeline());
        List<MeasuredValues> temp = query.getResultList();
        em.close();
        return temp;
    }

    private MetadataGroupToValues getMetadataGroupValue(String mg) {
        MetadataGroupToValues v = null;
        EntityManager em = getEntityManager();
        TypedQuery<MetadataGroupToValues> query
                = em.createNamedQuery(
                        "MetadataGroupToValues.findByMetadataGroup",
                        MetadataGroupToValues.class);
        query.setParameter("metadataGroup", mg);
        query.setMaxResults(1);
        try {
            v = query.getSingleResult();
        } catch (Exception e) {
        }
        em.close();
        return v;
    }

    // We do not wish to send the meta-data group checksum or the values
    // for every measurement. So, we group all of the distinct meta-data groups
    // and send them with the measurements. Within each measurement, we replace
    // the meta-data group checksum with the id.
    private List<MetadataGroupToValues> convertMetadataGroupsToIndices(List<MeasuredValues> g) {
        List<MetadataGroupToValues> mgs = new ArrayList<>();
        HashMap<String, MetadataGroupToValues> distinct = new HashMap<>();
        Iterator<MeasuredValues> i = g.iterator();
        while (i.hasNext()) {
            MeasuredValues v = i.next();
            String checksum = v.getMetadataGroup();
            MetadataGroupToValues mg = distinct.get(checksum);
            if (mg == null) {
                mg = getMetadataGroupValue(checksum);
                if (mg != null) {
                    distinct.put(checksum, mg);
                    mgs.add(mg);
                }
            }
            v.setMetadataGroupIndex(mg == null
                    ? -1L : mg.getMetadataGroupToValuesId());
        }
        return mgs;
    }

    public List<ProcedureMetadataGroup> getProcedureMetadataGroups(
            Integer centreId,
            Integer genotypeId,
            Integer strainId,
            String parameterKey) {
        List<ProcedureMetadataGroup> t = null;
        EntityManager em = getEntityManager();
        TypedQuery<ProcedureMetadataGroup> q
                = em.createNamedQuery("ProcedureAnimalOverview.findByCidGidSidQeid",
                        ProcedureMetadataGroup.class);
        q.setParameter("centreId", centreId);
        q.setParameter("genotypeId", genotypeId);
        q.setParameter("strainId", strainId);
        q.setParameter("parameterId", parameterKey);
        try {
            t = q.getResultList();
        } catch (Exception e) {
        }
        em.close();
        return t;
    }

    public int getQcStatus(
            Integer centreId,
            Integer genotypeId,
            Integer strainId,
            String parameterKey) {
        EntityManager em = getEntityManager();
        int status = QC_PENDING;
        TypedQuery<StateAndUnresolvedIssuesCount> q
                = em.createNamedQuery("DataContext.getStatusAndCountQcIssues",
                        StateAndUnresolvedIssuesCount.class);
        q.setParameter("centreId", centreId);
        q.setParameter("genotypeId", genotypeId);
        q.setParameter("strainId", strainId);
        q.setParameter("parameterId", parameterKey);
        q.setMaxResults(1);
        try {
            StateAndUnresolvedIssuesCount r = q.getSingleResult();
            if (r.getStateId() == 1) {
                status = QC_DONE;
            }
            if (r.getNumUnresolved() > 0) {
                status = QC_ISSUES;
            }
        } catch (Exception e) {
        }
        em.close();
        return status;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public MeasurementsPack extjsFindBy(
            @QueryParam("cid") Integer centreId,
            @QueryParam("gid") Integer genotypeId,
            @QueryParam("sid") Integer strainId,
            @QueryParam("qeid") String parameterKey,
            @QueryParam("includeBaseline") Boolean includeBaseline) {
        MeasurementsPack p = new MeasurementsPack();
        if (centreId == null || genotypeId == null || strainId == null
                || parameterKey == null || parameterKey.isEmpty()) {
            p.setDataSet(null, 0L);
        } else {
            List<ProcedureMetadataGroup> t = getProcedureMetadataGroups(
                    centreId, genotypeId, strainId, parameterKey);
            if (t == null || t.isEmpty()) {
                p.setDataSet(null, 0L);
            } else {
                List<MeasuredValues> temp
                        = getMutantMeasurements(centreId, genotypeId,
                                strainId, t.get(0).getProcedureId(),
                                parameterKey);
                if (genotypeId != 0 && includeBaseline != null && includeBaseline) {
                    Iterator<ProcedureMetadataGroup> i = t.iterator();
                    while (i.hasNext()) {
                        temp.addAll(getBaselineMeasurements(centreId, strainId, parameterKey, i.next()));
                    }
                }
                List<MetadataGroupToValues> mgs = convertMetadataGroupsToIndices(temp);
                p.setMetadataGroups(mgs);
                p.setQcStatus(getQcStatus(centreId, genotypeId, strainId, parameterKey));
                p.setDataSet(temp);
            }
        }
        return p;
    }
}
