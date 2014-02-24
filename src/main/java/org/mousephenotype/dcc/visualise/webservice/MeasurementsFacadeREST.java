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

import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.entities.overviews.MeasuredValues;
import org.mousephenotype.dcc.entities.overviews.ProcedureAnimalOverview;
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
        TypedQuery<MeasuredValues> query =
                em.createNamedQuery(
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
            ProcedureAnimalOverview pao,
            String parameterKey) {
        EntityManager em = getEntityManager();
        TypedQuery<MeasuredValues> query =
                em.createNamedQuery(
                "MeasurementsPerformed.findBaselineMeasurements",
                MeasuredValues.class);
        query.setParameter("parameterId", parameterKey);
        query.setParameter("centreId", pao.getCentreId());
        query.setParameter("strainId", pao.getStrainId());
        query.setParameter("procedureId", pao.getProcedureId());
        query.setParameter("metadataGroup", pao.getMetadataGroup());
        query.setParameter("pipeline", pao.getPipeline());
        List<MeasuredValues> temp = query.getResultList();
        em.close();
        return temp;
    }

    public ProcedureAnimalOverview getProcedureAnimalOverview(
            Integer centreId,
            Integer genotypeId,
            Integer strainId,
            String parameterKey) {
        ProcedureAnimalOverview pao = null;
        EntityManager em = getEntityManager();
        TypedQuery<ProcedureAnimalOverview> q =
                em.createNamedQuery("ProcedureAnimalOverview.findByCidGidSidQeid",
                ProcedureAnimalOverview.class);
        q.setParameter("centreId", centreId);
        q.setParameter("genotypeId", genotypeId);
        q.setParameter("strainId", strainId);
        q.setParameter("parameterId", parameterKey);
        q.setMaxResults(1);
        try {
            pao = q.getSingleResult();
        } catch (Exception e) {
        }
        em.close();
        return pao;
    }

    public int getQcStatus(
            Integer genotypeId,
            Integer strainId,
            String parameterKey) {
        EntityManager em = getEntityManager();
        int status = QC_PENDING;
        TypedQuery<StateAndUnresolvedIssuesCount> q =
                em.createNamedQuery("DataContext.getStatusAndCountQcIssues",
                StateAndUnresolvedIssuesCount.class);
        q.setParameter("genotypeId", genotypeId);
        q.setParameter("strainId", strainId);
        q.setParameter("parameterId", parameterKey);
        q.setMaxResults(1);
        try {
            StateAndUnresolvedIssuesCount r = q.getSingleResult();
            if (r.getStateId() == 1) {
                status = QC_DONE;
            } else {
                if (r.getNumUnresolved() > 0) {
                    status = QC_ISSUES;
                }
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
            ProcedureAnimalOverview pao = getProcedureAnimalOverview(
                    centreId, genotypeId, strainId, parameterKey);
            if (pao == null) {
                p.setDataSet(null, 0L);
            } else {
                List<MeasuredValues> temp =
                        getMutantMeasurements(centreId, genotypeId,
                        strainId, pao.getProcedureId(), parameterKey);
                if (genotypeId != 0 && includeBaseline != null && includeBaseline) {
                    temp.addAll(getBaselineMeasurements(pao, parameterKey));
                }
                p.setQcStatus(getQcStatus(genotypeId, strainId, parameterKey));
                p.setDataSet(temp);
            }
        }
        return p;
    }
}
