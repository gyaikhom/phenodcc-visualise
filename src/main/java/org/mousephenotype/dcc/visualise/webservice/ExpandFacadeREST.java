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
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;

/**
 * Web service for retrieving parameter list from ontology or procedure type.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("expand")
public class ExpandFacadeREST extends AbstractFacade<String> {

    private final String MPTERM_REGEX = "MP:[0-9]*";
    private final String PARAM_REGEX = "[A-Z]*_[A-Z]*_[0-9]*_[0-9]*";
    private final List<Integer> genotypeIds = new ArrayList<>();
    private final List<String> parameters = new ArrayList<>();
    private final List<String> mpTerms = new ArrayList<>();
    private final List<Integer> procedureTypes = new ArrayList<>();
    private EntityManager em;

    public ExpandFacadeREST() {
        super(String.class);
    }

    private List<Integer> retrieveGenotypeId(String geneSpec) {
        String[] temp = geneSpec.split("\\s*-\\s*");
        List<Integer> gid = new ArrayList<>();
        try {
            gid.add(Integer.parseInt(temp[0]));
        } catch (NumberFormatException e) {
        }
        return gid;
    }

    private Boolean setGenotypeIds(String gids) {
        List<String> temp = Arrays.asList(gids.split("\\s*,\\s*"));
        for (String t : temp) {
            try {
                genotypeIds.addAll(retrieveGenotypeId(t));
            } catch (NumberFormatException e) {
            }
        }
        return !genotypeIds.isEmpty();
    }

    private Boolean setMpTermsAndProcedureTypes(String types) {
        List<String> temp = Arrays.asList(types.split("\\s*,\\s*"));
        for (String t : temp) {
            if (t.matches(MPTERM_REGEX)) {
                mpTerms.add(t);
            } else {
                if (t.matches(PARAM_REGEX)) {
                    parameters.add(t);
                } else {
                    try {
                        procedureTypes.add(Integer.parseInt(t));
                    } catch (NumberFormatException x) {
                    }
                }
            }
        }
        return !(parameters.isEmpty() && mpTerms.isEmpty() && procedureTypes.isEmpty());
    }

    private List<String> getParameterIdsFromMpTerms() {
        if (mpTerms.isEmpty()) {
            return null;
        }
        TypedQuery<String> q = em.createQuery(
                "select distinct a.parameterId from Annotation a where (a.yMP in :mpTerms or a.yMP1 in :mpTerms) and a.genotypeId in :genotypeIds", String.class);
        q.setParameter("genotypeIds", genotypeIds);
        q.setParameter("mpTerms", mpTerms);
        return q.getResultList();
    }

    private List<String> getParameterIdsFromProcedureTypes() {
        if (procedureTypes.isEmpty()) {
            return null;
        }
        TypedQuery<String> q = em.createQuery(
                "select distinct q.parameterKey from Parameter q, Procedure p, ProcedureHasParameters php, ProcedureHasSuperType phs, Annotation a where q.parameterId = php.parameterId.parameterId and p.procedureId = php.procedureId.procedureId and p.procedureId = phs.procedureId and phs.type in :procedureTypes and q.parameterKey = a.parameterId and a.genotypeId in :genotypeIds and q.isDerived = 0 and q.isMedia = 0 and q.isAnnotation = 1", String.class);
        q.setParameter("genotypeIds", genotypeIds);
        q.setParameter("procedureTypes", procedureTypes);
        return q.getResultList();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public ExpandPack extjsFindBy(
            @QueryParam("gids") String gids,
            @QueryParam("types") String types) {
        ExpandPack p = new ExpandPack();
        if (gids == null || types == null) {
            p.setDataSet(null, 0L);
        } else {
            em = getEntityManager();
            if (setGenotypeIds(gids) && setMpTermsAndProcedureTypes(types)) {
                List<String> m = getParameterIdsFromMpTerms();
                List<String> t = getParameterIdsFromProcedureTypes();
                if (m != null) {
                    parameters.addAll(m);
                }
                if (t != null) {
                    parameters.addAll(t);
                }
                Set<String> s = new HashSet<>(parameters);
                List<String> l = Arrays.asList(s.toArray(new String[0]));
                Collections.sort(l);
                p.setDataSet(l);
            }
            em.close();
        }
        return p;
    }
}
